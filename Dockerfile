FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

ENV VITE_MOCK_API=true
ENV HOST=0.0.0.0

CMD ["npm", "run", "preview:web"]
