const { asyncHandler } = require("../utils/asyncHandler");
const { User } = require("../models/User");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseLimit(value, fallback = 20, max = 50) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

const listUsers = asyncHandler(async (req, res) => {
  const q = (req.query.q ?? "").toString().trim();
  const limit = parseLimit(req.query.limit);
  const escapedQuery = escapeRegex(q);

  const filter = {
    _id: { $ne: req.user._id },
    ...(q
      ? {
          $or: [
            { name: { $regex: escapedQuery, $options: "i" } },
            { email: { $regex: escapedQuery, $options: "i" } },
          ],
        }
      : {}),
  };

  const users = await User.find(filter).sort({ createdAt: -1 }).limit(limit);
  res.json({ users: users.map((u) => u.toSafeJSON()) });
});

module.exports = { listUsers };
