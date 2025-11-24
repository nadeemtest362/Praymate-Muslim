import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // TEMPORARY DEBUGGING: Log critical env vars at the very start
  console.log('Attempting to read OPENAI_API_KEY directly from process.env:', process.env.OPENAI_API_KEY ? 'Exists' : 'MISSING OR EMPTY');
  console.log('Attempting to read SUPABASE_URL directly from process.env:', process.env.SUPABASE_URL ? 'Exists' : 'MISSING OR EMPTY');
  console.log('Attempting to read SUPABASE_SERVICE_ROLE_KEY directly from process.env:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Exists' : 'MISSING OR EMPTY');
  // You can also log the actual values if you are comfortable with them appearing in Railway's runtime logs temporarily
  // console.log('OPENAI_API_KEY value:', process.env.OPENAI_API_KEY); 
  // console.log('SUPABASE_URL value:', process.env.SUPABASE_URL);
  // console.log('SUPABASE_SERVICE_ROLE_KEY value:', process.env.SUPABASE_SERVICE_ROLE_KEY);


  const app = await NestFactory.create(AppModule);

  // Enable CORS if needed (e.g., if called directly from a browser/different origin)
  app.enableCors({
    origin: true, // Allow all origins - adjust for production if needed
    credentials: true,
  }); 

  const port = process.env.PORT || 3002; // Changed from 3001 to 3002 to match Edge Function
  await app.listen(port);
  console.log(`Application is running on port ${port}`);
}
bootstrap(); 