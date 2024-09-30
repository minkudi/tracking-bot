const { Client } = require('whatsapp-web.js');
const mysql = require('mysql2/promise');
const express = require('express');
const qr = require('qr-image');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Configuration de la base de données
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

// Création du client WhatsApp
const client = new Client();

let qrCode = null;

// Événement lorsque le QR code est généré
client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrCode = qr;
});

// Événement lorsque le client est prêt
client.on('ready', () => {
    console.log('Client is ready!');
});

// Route pour afficher le code QR
app.get('/qr', (req, res) => {
    if (qrCode) {
        const qr_svg = qr.image(qrCode, { type: 'svg' });
        res.type('svg');
        qr_svg.pipe(res);
    } else {
        res.send('QR Code not generated yet.');
    }
});

// Fonction pour vérifier le statut d'une commande
async function checkOrderStatus(orderNumber) {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [rows] = await connection.execute(
      'SELECT statut FROM commandes WHERE numero_commande = ?',
      [orderNumber]
    );
    if (rows.length > 0) {
      return rows[0].statut;
    } else {
      return 'Commande non trouvée';
    }
  } finally {
    await connection.end();
  }
}

// Gestion des messages entrants
client.on('message', async (message) => {
  if (message.body.length === 4 && /^\d+$/.test(message.body)) {
    const orderNumber = message.body;
    const status = await checkOrderStatus(orderNumber);
    message.reply(`Le statut de la commande ${orderNumber} est : ${status}`);
  }
});

// Initialisation du client
client.initialize();

// Démarrage du serveur Express
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});