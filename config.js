require('dotenv').config();

module.exports = {
  SERVER_PORT: process.env.SERVER_PORT || 8888,
  DOMAIN: process.env.DOMAIN
}
