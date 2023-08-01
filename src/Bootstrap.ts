import { mongo } from "./Services/Mongo";

export async function bootstrap() {
  await database();
}

async function database() {
  await mongo.connect();
}
