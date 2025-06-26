import {
  conversations,
  createConversation,
  type ConversationFlavor,
} from "@grammyjs/conversations";
import "dotenv/config";
import * as fs from "fs";
import {
  Bot,
  InputFile,
  session,
  type Context,
  type SessionFlavor,
} from "grammy";
import * as os from "os";
import * as path from "path";
import { processImage } from "./image-processor";
import { masks } from "./masks";
import type { BotSession, OutputFormat } from "./types";

// Load environment variables
const BOT_TOKEN = process.env.BOT_TOKEN || "";

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN is required");
  process.exit(1);
}

// Define the context type with both session and conversation flavors
type MyContext = Context & SessionFlavor<BotSession> & ConversationFlavor;

// Create bot instance
const bot = new Bot<MyContext>(BOT_TOKEN);

// Configure session storage
bot.use(
  session({
    initial(): BotSession {
      return {
        imagePath: "",
        selectedMask: null,
        selectedFormat: null,
      };
    },
  })
);

// Use conversations
bot.use(conversations());

// Define the main conversation flow
async function imageMaskConversation(conversation: any, ctx: MyContext) {
  // Step 1: Wait for user to upload an image
  await ctx.reply("Please send me an image to apply a mask.");

  const imageMsg = await conversation.wait();
  if (!imageMsg.message?.photo) {
    await ctx.reply("That's not an image. Please send an image.");
    return;
  }

  // Get the highest resolution photo
  const photo = imageMsg.message.photo[imageMsg.message.photo.length - 1];
  const fileId = photo.file_id;

  // Download the image
  await ctx.reply("Downloading your image...");
  const file = await ctx.api.getFile(fileId);
  const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;

  // Create temp directory for storing images
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tg-mask-"));
  const imagePath = path.join(tempDir, "original.jpg");

  // Download the file
  const response = await fetch(fileUrl);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(imagePath, Buffer.from(buffer));

  // Save the image path in session
  conversation.session.imagePath = imagePath;

  // Step 2: Ask for output format
  await ctx.reply("Please select the output format:", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📱 Stories (1080x1920)", callback_data: "format_stories" },
          {
            text: "⬜ Square Post (1080x1080)",
            callback_data: "format_square",
          },
        ],
      ],
    },
  });

  // Wait for format selection
  const formatSelection = await conversation.waitFor("callback_query:data");
  const formatType = formatSelection.callbackQuery.data.replace(
    "format_",
    ""
  ) as "stories" | "square";

  const selectedFormat: OutputFormat = {
    type: formatType,
    width: 1080,
    height: formatType === "stories" ? 1920 : 1080,
  };

  conversation.session.selectedFormat = selectedFormat;

  // Acknowledge the format selection
  await formatSelection.answerCallbackQuery({
    text: `You selected ${
      formatType === "stories" ? "Stories format" : "Square format"
    }`,
  });

  const selectedMask = masks[0];

  conversation.session.selectedMask = selectedMask;

  // Step 3: Process the image and send it back
  await ctx.reply(
    `Processing your image with ${selectedMask.name} in ${formatType} format...`
  );

  try {
    const outputPath = path.join(tempDir, "result.jpg");
    await processImage(
      conversation.session.imagePath,
      selectedMask,
      conversation.session.selectedFormat!,
      outputPath
    );

    // Send the processed image
    await ctx.replyWithPhoto(new InputFile(outputPath), {
      caption: `Your ${formatType} applied! 🎭\n\nFormat: ${selectedFormat.width}x${selectedFormat.height}`,
    });

    // Clean up
    await ctx.reply(
      "Would you like to try again? Just send a new image or type /start to begin again."
    );

    // Clean up temp files
    try {
      fs.unlinkSync(imagePath);
      fs.unlinkSync(outputPath);
      fs.rmdirSync(tempDir);
    } catch (e) {
      console.error("Error cleaning up temp files:", e);
    }
  } catch (error) {
    console.error("Error processing image:", error);
    await ctx.reply(
      "Sorry, there was an error processing your image. Please try again."
    );
  }
}

// Register the conversation
bot.use(createConversation(imageMaskConversation, "image-mask-conversation"));

// Command handlers
bot.command("start", async (ctx) => {
  await ctx.reply(
    "Welcome to the Image Mask Bot! 🎭\n\n" +
      "I can apply fun masks to your photos and format them for:\n" +
      "📱 Instagram Stories (1080x1920)\n" +
      "⬜ Square Posts (1080x1080)\n\n" +
      "Let's get started!"
  );
  await ctx.conversation.enter("image-mask-conversation");
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    "This bot allows you to apply fun masks to your images! 🎭\n\n" +
      "Features:\n" +
      "• Apply masks to your photos\n" +
      "• Format for Instagram Stories (1080x1920)\n" +
      "• Format for Square Posts (1080x1080)\n" +
      "• Masks are positioned at the bottom\n" +
      "• Images are center-cropped to fit\n\n" +
      "Available masks:\n" +
      "🕶️ Sunglasses\n" +
      "🎉 Party Hat\n" +
      "👑 Crown\n" +
      "👨 Mustache\n" +
      "🧔 Beard\n" +
      "🦋 Butterfly\n\n" +
      "Commands:\n" +
      "/start - Start the process\n" +
      "/help - Show this help message"
  );
});

bot.api.setMyCommands([
  { command: "start", description: "Start the bot" },
  { command: "help", description: "Show help text" },
]);

// Handle any photo sent outside of conversation
bot.on("message:photo", async (ctx) => {
  await ctx.reply("Please use /start to begin the mask application process!");
});

// Error handling
bot.catch((err) => {
  console.error("Bot error:", err);
});

// Start the bot
bot.start({
  onStart: (botInfo) => {
    console.log(`Bot @${botInfo.username} started! 🚀`);
    console.log("Send /start to begin using the bot");
  },
});
