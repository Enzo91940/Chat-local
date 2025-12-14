const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');

const application = express();
const serveurHttp = http.createServer(application);
const io = socketIo(serveurHttp);
const PORT = 3002;

/*Gestion des utilisateurs  */

const FICHIER_UTILISATEURS = path.join(__dirname, 'utilisateurs.json');
if (!fs.existsSync(FICHIER_UTILISATEURS)) {
  fs.writeFileSync(FICHIER_UTILISATEURS, '{}');
}

const chargerUtilisateurs = () =>
  JSON.parse(fs.readFileSync(FICHIER_UTILISATEURS));

const sauvegarderUtilisateurs = (utilisateurs) =>
  fs.writeFileSync(
    FICHIER_UTILISATEURS,
    JSON.stringify(utilisateurs, null, 2)
  );

/*Configuration Express*/

application.use(express.static(path.join(__dirname, 'public')));

// Redirection racine vers la page de connexion
application.get('/', (requete, reponse) => {
  reponse.redirect('/login.html');
});

/*Socket.IO */

io.on('connection', (socket) => {

  socket.on('inscription', ({ nomUtilisateur, motDePasse }) => {
    const utilisateurs = chargerUtilisateurs();

    if (utilisateurs[nomUtilisateur]) {
      socket.emit('erreur inscription', 'Utilisateur déjà existant.');
    } else {
      utilisateurs[nomUtilisateur] = { motDePasse };
      sauvegarderUtilisateurs(utilisateurs);
      socket.emit('succes inscription');
    }
  });

  socket.on('connexion', ({ nomUtilisateur, motDePasse }) => {
    const utilisateurs = chargerUtilisateurs();

    if (
      !utilisateurs[nomUtilisateur] ||
      utilisateurs[nomUtilisateur].motDePasse !== motDePasse
    ) {
      socket.emit('erreur connexion', 'Identifiants invalides.');
    } else {
      socket.nomUtilisateur = nomUtilisateur;
      socket.emit('succes connexion', nomUtilisateur);
      io.emit('message chat', `${nomUtilisateur} a rejoint le chat.`);
    }
  });

  socket.on('reconnexion utilisateur', (nomUtilisateur) => {
    socket.nomUtilisateur = nomUtilisateur;
  });

  socket.on('message chat', (message) => {
    if (socket.nomUtilisateur) {
      io.emit(
        'message chat',
        `${socket.nomUtilisateur} : ${message}`
      );
    } else {
      socket.emit('message chat', 'Veuillez vous connecter.');
    }
  });

  socket.on('disconnect', () => {
    if (socket.nomUtilisateur) {
      io.emit(
        'message chat',
        `${socket.nomUtilisateur} a quitté le chat.`
      );
    }
  });

});

/* Démarrage du serveur */

serveurHttp.listen(PORT, () => {
  console.log(`Serveur en écoute sur http://localhost:${PORT}`);
});
