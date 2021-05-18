FROM node:14.5-alpine3.12

RUN mkdir -p /foxtail

WORKDIR /foxtail

COPY package.json package.json

RUN npm install

COPY . .

EXPOSE 9000

CMD ["npm","run","prostart"]
