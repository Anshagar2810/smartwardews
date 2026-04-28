import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
  let token = req.headers.authorization;

  if (!token) return res.status(401).json({ message: "No token" });

  try {
    token = token.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};
