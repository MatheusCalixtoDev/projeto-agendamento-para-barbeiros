// src/controllers/authController.js
const prisma = require("../config/prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

class AuthController {
  async login(req, res) {
    const { username, password } = req.body;
    const JWT_SECRET = process.env.JWT_SECRET;

    try {
      const admin = await prisma.admin.findUnique({ where: { username } });

      if (!admin || !bcrypt.compareSync(password, admin.passwordHash)) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      const token = jwt.sign(
        { id: admin.id, username: admin.username },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      return res.json({
        token,
        user: { id: admin.id, username: admin.username },
      });
    } catch (error) {
      return res.status(500).json({ error: "Erro interno no servidor." });
    }
  }
}

module.exports = new AuthController();
