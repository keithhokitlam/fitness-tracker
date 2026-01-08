# 💪 Fitness Tracker

A Next.js fitness tracking app that uses OpenAI to calculate calories burned based on your workout type and duration.

## 🚀 Quick Start (For Experienced Users)

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up OpenAI API Key

1. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a `.env.local` file in the root directory
3. Add your API key:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 📖 Complete Beginner's Guide

**New to programming or setting up apps?** Check out the **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** file for extremely detailed, step-by-step instructions that assume zero prior computer experience. It covers:

- How to get an OpenAI API key (with screenshots descriptions)
- How to create the environment file
- How to install Node.js (if you don't have it)
- How to use the terminal/command prompt
- How to navigate folders
- How to start and use the app
- Troubleshooting common problems

The guide breaks down every single step in detail, perfect for absolute beginners!

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

**📖 Complete Deployment Guide:** See **[DEPLOY_TO_VERCEL.md](./DEPLOY_TO_VERCEL.md)** for detailed, step-by-step instructions on how to deploy this app to Vercel, including:
- Setting up a GitHub account
- Installing Git
- Uploading your code to GitHub
- Creating a Vercel account
- Configuring environment variables (OpenAI API key)
- Deploying your app
- Troubleshooting common issues

The guide assumes zero prior experience with deployment and includes screenshots descriptions and detailed explanations.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
