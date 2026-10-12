const { getProviderLeaderboard } = require("../services/leaderboard.service");

const { AppError } = require("../utils/errors");
const { toId, assertAdminOwnsGym } = require("../utils/scope");

async function getProviderLeaderboardController(req, res, next) {
  try {
    let gymId;

    if (req.auth.role === "GYM_ADMIN") {
      if (!req.query.gymId) {
        throw new AppError("VALIDATION", "GYM_ADMIN must provide gymId");
      }

      gymId = toId(req.query.gymId, "gymId");

      await assertAdminOwnsGym(req.auth.adminId, gymId);
    } else {
      // Providers can see only the leaderboard for their own gym.
      if (!req.auth.gymId) {
        throw new AppError(
          "FORBIDDEN",
          "This provider is not associated with a gym",
        );
      }

      gymId = req.auth.gymId;
    }

    const data = await getProviderLeaderboard({
      gymId,
      type: req.query.type,
      query: req.query,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getProviderLeaderboardController };
