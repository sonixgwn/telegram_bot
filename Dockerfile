# Use official Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy bot files
COPY . .

# Expose port (optional, not needed for Telegram bot)
EXPOSE 3000

# Run the bot
CMD ["node", "bot.js"]