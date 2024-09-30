// Fichier : bot.js
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuration de la base de données
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

// Création du client WhatsApp
const client = new Client();

// Événement lorsque le QR code est généré
client.on('qr', (qr) => {
    qrcode.generate(qr, {small: true});
});

// Événement lorsque le client est prêt
client.on('ready', () => {
    console.log('Client is ready!');
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