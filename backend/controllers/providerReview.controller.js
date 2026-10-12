const { getProviderReviews } = require("../services/providerReview.service");

async function getProviderReviewsController(req, res, next) {
  try {
    const data = await getProviderReviews(req.params.id, req.query);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getProviderReviewsController };
