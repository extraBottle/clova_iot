const config = {
  SERVER_PORT: process.env.SERVER_PORT || 8888,
  DOMAIN: process.env.DOMAIN
};

export const { SERVER_PORT, DOMAIN } = config;
export default config;