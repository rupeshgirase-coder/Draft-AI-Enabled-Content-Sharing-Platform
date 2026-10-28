const { GoogleGenAI } = require('@google/genai');
const Post = require('../models/Post');

// POST /ai/improve/:postId — Send content to Gemini AI and save as a new draft
const improvePostContent = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only improve your own posts' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: `Improve the grammar, clarity, and readability of the following content while preserving its original meaning:\n\n${post.content}`,
    });

    const newDraft = await Post.create({
      title: `${post.title} (Improved)`,
      description: post.description,
      content: response.text.trim(),
      image: post.image,
      category: post.category,
      createdBy: req.user._id,
      status: 'draft',
    });

    return res.status(201).json({
      message: 'Improved content saved as a new draft',
      originalPostId: post._id,
      newDraft,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /ai/process-document — Upload and process document with Gemini AI
const processDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a document file' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: req.file.mimetype,
            data: req.file.buffer.toString('base64'),
          },
        },
        {
          text: req.body.prompt || 'Summarize and analyze this document, highlighting key points.',
        },
      ],
    });

    return res.status(200).json({
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      analysis: response.text,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { improvePostContent, processDocument };
