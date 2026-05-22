import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const exercises = [
  { name: 'Barbell Bench Press', muscle_group: 'chest', equipment: 'barbell', difficulty: 'intermediate' },
  { name: 'Dumbbell Flyes', muscle_group: 'chest', equipment: 'dumbbell', difficulty: 'beginner' },
  { name: 'Incline Dumbbell Press', muscle_group: 'chest', equipment: 'dumbbell', difficulty: 'intermediate' },
  { name: 'Push-ups', muscle_group: 'chest', equipment: 'bodyweight', difficulty: 'beginner' },
  { name: 'Cable Crossovers', muscle_group: 'chest', equipment: 'cable', difficulty: 'intermediate' },
  
  { name: 'Deadlift', muscle_group: 'back', equipment: 'barbell', difficulty: 'advanced' },
  { name: 'Pull-ups', muscle_group: 'back', equipment: 'bodyweight', difficulty: 'intermediate' },
  { name: 'Barbell Row', muscle_group: 'back', equipment: 'barbell', difficulty: 'intermediate' },
  { name: 'Lat Pulldown', muscle_group: 'back', equipment: 'cable', difficulty: 'beginner' },
  { name: 'Seated Cable Row', muscle_group: 'back', equipment: 'cable', difficulty: 'beginner' },
  
  { name: 'Overhead Press', muscle_group: 'shoulders', equipment: 'barbell', difficulty: 'intermediate' },
  { name: 'Lateral Raises', muscle_group: 'shoulders', equipment: 'dumbbell', difficulty: 'beginner' },
  { name: 'Front Raises', muscle_group: 'shoulders', equipment: 'dumbbell', difficulty: 'beginner' },
  { name: 'Face Pulls', muscle_group: 'shoulders', equipment: 'cable', difficulty: 'beginner' },
  { name: 'Arnold Press', muscle_group: 'shoulders', equipment: 'dumbbell', difficulty: 'intermediate' },
  
  { name: 'Squat', muscle_group: 'legs', equipment: 'barbell', difficulty: 'advanced' },
  { name: 'Leg Press', muscle_group: 'legs', equipment: 'machine', difficulty: 'beginner' },
  { name: 'Lunges', muscle_group: 'legs', equipment: 'dumbbell', difficulty: 'intermediate' },
  { name: 'Leg Extensions', muscle_group: 'legs', equipment: 'machine', difficulty: 'beginner' },
  { name: 'Leg Curls', muscle_group: 'legs', equipment: 'machine', difficulty: 'beginner' },
  
  { name: 'Barbell Curl', muscle_group: 'biceps', equipment: 'barbell', difficulty: 'beginner' },
  { name: 'Hammer Curls', muscle_group: 'biceps', equipment: 'dumbbell', difficulty: 'beginner' },
  { name: 'Preacher Curl', muscle_group: 'biceps', equipment: 'machine', difficulty: 'intermediate' },
  { name: 'Concentration Curls', muscle_group: 'biceps', equipment: 'dumbbell', difficulty: 'beginner' },
  
  { name: 'Tricep Pushdown', muscle_group: 'triceps', equipment: 'cable', difficulty: 'beginner' },
  { name: 'Skull Crushers', muscle_group: 'triceps', equipment: 'barbell', difficulty: 'intermediate' },
  { name: 'Overhead Tricep Extension', muscle_group: 'triceps', equipment: 'dumbbell', difficulty: 'intermediate' },
  { name: 'Dips', muscle_group: 'triceps', equipment: 'bodyweight', difficulty: 'advanced' },
  
  { name: 'Crunches', muscle_group: 'core', equipment: 'bodyweight', difficulty: 'beginner' },
  { name: 'Plank', muscle_group: 'core', equipment: 'bodyweight', difficulty: 'beginner' },
  { name: 'Russian Twists', muscle_group: 'core', equipment: 'bodyweight', difficulty: 'intermediate' },
  { name: 'Leg Raises', muscle_group: 'core', equipment: 'bodyweight', difficulty: 'intermediate' },
  { name: 'Cable Crunches', muscle_group: 'core', equipment: 'cable', difficulty: 'intermediate' }
];

async function main() {
  console.log('Start seeding exercises...');
  for (const ex of exercises) {
    await prisma.exercise.create({
      data: {
        name: ex.name,
        muscle_group: ex.muscle_group,
        equipment: ex.equipment,
        difficulty: ex.difficulty,
        secondary_muscles: []
      }
    });
  }
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
