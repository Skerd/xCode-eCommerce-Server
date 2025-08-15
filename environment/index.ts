import * as dotenv from 'dotenv';

dotenv.config();

export const CONSTANTS = {
    DEFAULT_LANGUAGE: process.env.DEFAULT_LANGUAGE,
    SUPPORTED_LANGUAGES: process.env.SUPPORTED_LANGUAGES.split(",")
};