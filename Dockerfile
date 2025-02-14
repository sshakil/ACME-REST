FROM node:23

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 4000

ENTRYPOINT ["sh", "/app/start.sh"]