require("dotenv").config();

export const config = {
  spinalConnector: {
    name: process.env.ORGAN_NAME || "EDIT_ME",
    userId: process.env.USER_ID || "EDIT_ME",
    password: process.env.PASSWORD || "EDIT_ME",
    protocol: process.env.PROTOCOL || "EDIT_ME",
    host: process.env.HOST || "EDIT_ME",
    port: process.env.PORT || "EDIT_ME",
    path: process.env.PATH || "EDIT_ME",
  },
};
