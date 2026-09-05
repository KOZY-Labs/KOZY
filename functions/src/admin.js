// Shared firebase-admin singleton for every function in this codebase.
const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

if (!getApps().length) {
  initializeApp();
}

module.exports = {
  db: getFirestore(),
  storage: getStorage(),
};
