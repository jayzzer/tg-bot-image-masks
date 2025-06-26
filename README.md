# Telegram Image Mask Bot

A Telegram bot that allows users to upload images, select from 6 different masks, and receive their image with the selected mask applied.

## Features

- Upload images via Telegram
- Choose from 6 different mask options
- Receive processed images with masks applied

## Setup

1. Clone this repository
2. Install dependencies:
   \`\`\`
   npm install
   \`\`\`
3. Create a `.env` file with your Telegram bot token:
   \`\`\`
   BOT_TOKEN=your_telegram_bot_token
   \`\`\`
4. Create an `assets/masks` directory and add your mask PNG images with transparent backgrounds
5. Build and run the bot:
   \`\`\`
   npm run build
   npm start
   \`\`\`

## Usage

1. Start a chat with your bot on Telegram
2. Send the `/start` command
3. Upload an image
4. Select a mask from the options
5. Receive your processed image!
