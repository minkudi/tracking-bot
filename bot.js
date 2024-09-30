import {
    SecretsManagerClient,
    GetSecretValueCommand,
  } from "@aws-sdk/client-secrets-manager";
  import { Client } from 'whatsapp-web.js';
  import mysql from 'mysql2/promise';
  import express from 'express';
  import qr from 'qr-image';
  import dotenv from 'dotenv';
  
  dotenv.config();
  
  const app = express();
  const port = process.env.PORT || 3001;
  
  // Configuration AWS
  const secret_name = "my-bot-secrets";
  const client = new SecretsManagerClient({ region: "eu-north-1" });
  
  async function getSecrets() {
      let response;
  
      try {
          response = await client.send(
              new GetSecretValueCommand({
                  SecretId: secret_name,
                  VersionStage: "AWSCURRENT",
              })
          );
      } catch (error) {
          console.error("Error retrieving secrets:", error);
          throw error;
      }
  
      return JSON.parse(response.SecretString);
  }
  
  (async () => {
      const secrets = await getSecrets();
  
      // Configuration de la base de données
      const dbConfig = {
          host: secrets.DB_HOST,
          user: secrets.DB_USER,
          password: secrets.DB_PASSWORD,
          database: secrets.DB_NAME,
      };
  
      // Création du client WhatsApp
      const clientWhatsApp = new Client();
  
      let qrCode = null;
  
      // Événement lorsque le QR code est généré
      clientWhatsApp.on('qr', (qr) => {
          console.log('QR RECEIVED', qr);
          qrCode = qr;
      });
  
      // Événement lorsque le client est prêt
      clientWhatsApp.on('ready', () => {
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
      clientWhatsApp.on('message', async (message) => {
          if (message.body.length === 4 && /^\d+$/.test(message.body)) {
              const orderNumber = message.body;
              const status = await checkOrderStatus(orderNumber);
              message.reply(`Le statut de la commande ${orderNumber} est : ${status}`);
          }
      });
  
      // Initialisation du client WhatsApp
      clientWhatsApp.initialize();
  
      // Démarrage du serveur Express
      app.listen(port, () => {
          console.log(`Server running at http://localhost:${port}`);
      });
  })();
  