import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const exercises = [
  // CHEST
  { name: 'Barbell Bench Press', muscle_group: 'chest', equipment: 'barbell', difficulty: 'intermediate', video_url: 'https://assets.mixkit.co/videos/preview/mixkit-gym-workout-bench-press-close-up-34346-large.mp4' },
  { name: 'Incline Dumbbell Press', muscle_group: 'chest', equipment: 'dumbbell', difficulty: 'intermediate', video_url: 'https://assets.mixkit.co/videos/preview/mixkit-man-training-his-chest-with-dumbbells-41618-large.mp4' },
  { name: 'Cable Crossovers', muscle_group: 'chest', equipment: 'cable', difficulty: 'beginner', video_url: 'https://assets.mixkit.co/videos/preview/mixkit-athlete-training-chest-flyes-with-cables-41617-large.mp4' },
  { name: 'Push-ups', muscle_group: 'chest', equipment: 'bodyweight', difficulty: 'beginner', video_url: '' },
  { name: 'Dumbbell Flyes', muscle_group: 'chest', equipment: 'dumbbell', difficulty: 'beginner', video_url: '' },
  { name: 'Incline Barbell Bench Press', muscle_group: 'chest', equipment: 'barbell', difficulty: 'intermediate', video_url: '' },
  { name: 'Decline Barbell Bench Press', muscle_group: 'chest', equipment: 'barbell', difficulty: 'intermediate', video_url: '' },
  { name: 'Chest Dips', muscle_group: 'chest', equipment: 'bodyweight', difficulty: 'advanced', video_url: '' },
  { name: 'Pec Deck Machine', muscle_group: 'chest', equipment: 'machine', difficulty: 'beginner', video_url: '' },
  { name: 'Dumbbell Pullover', muscle_group: 'chest', equipment: 'dumbbell', difficulty: 'intermediate', video_url: '' },

  // BACK
  { name: 'Deadlift', muscle_group: 'back', equipment: 'barbell', difficulty: 'advanced', video_url: 'https://assets.mixkit.co/videos/preview/mixkit-athlete-preparing-to-do-deadlift-41615-large.mp4' },
  { name: 'Pull-ups', muscle_group: 'back', equipment: 'bodyweight', difficulty: 'intermediate', video_url: '' },
  { name: 'Barbell Row', muscle_group: 'back', equipment: 'barbell', difficulty: 'intermediate', video_url: '' },
  { name: 'Lat Pulldown', muscle_group: 'back', equipment: 'cable', difficulty: 'beginner', video_url: '' },
  { name: 'Seated Cable Row', muscle_group: 'back', equipment: 'cable', difficulty: 'beginner', video_url: '' },
  { name: 'T-Bar Row', muscle_group: 'back', equipment: 'barbell', difficulty: 'intermediate', video_url: '' },
  { name: 'One-Arm Dumbbell Row', muscle_group: 'back', equipment: 'dumbbell', difficulty: 'beginner', video_url: '' },
  { name: 'Chin-ups', muscle_group: 'back', equipment: 'bodyweight', difficulty: 'intermediate', video_url: '' },
  { name: 'Inverted Row', muscle_group: 'back', equipment: 'bodyweight', difficulty: 'beginner', video_url: '' },
  { name: 'Hyperextensions', muscle_group: 'back', equipment: 'bodyweight', difficulty: 'beginner', video_url: '' },
  { name: 'Straight-Arm Lat Pulldown', muscle_group: 'back', equipment: 'cable', difficulty: 'beginner', video_url: '' },

  // SHOULDERS
  { name: 'Overhead Press', muscle_group: 'shoulders', equipment: 'barbell', difficulty: 'intermediate', video_url: '' },
  { name: 'Lateral Raises', muscle_group: 'shoulders', equipment: 'dumbbell', difficulty: 'beginner', video_url: '' },
  { name: 'Front Raises', muscle_group: 'shoulders', equipment: 'dumbbell', difficulty: 'beginner', video_url: '' },
  { name: 'Face Pulls', muscle_group: 'shoulders', equipment: 'cable', difficulty: 'beginner', video_url: '' },
  { name: 'Arnold Press', muscle_group: 'shoulders', equipment: 'dumbbell', difficulty: 'intermediate', video_url: '' },
  { name: 'Dumbbell Shoulder Press', muscle_group: 'shoulders', equipment: 'dumbbell', difficulty: 'beginner', video_url: '' },
  { name: 'Cable Lateral Raise', muscle_group: 'shoulders', equipment: 'cable', difficulty: 'beginner', video_url: '' },
  { name: 'Reverse Pec Deck (Rear Delt Fly)', muscle_group: 'shoulders', equipment: 'machine', difficulty: 'beginner', video_url: '' },
  { name: 'Barbell Shrugs', muscle_group: 'shoulders', equipment: 'barbell', difficulty: 'beginner', video_url: '' },
  { name: 'Upright Row', muscle_group: 'shoulders', equipment: 'barbell', difficulty: 'intermediate', video_url: '' },

  // LEGS
  { name: 'Squat', muscle_group: 'legs', equipment: 'barbell', difficulty: 'advanced', video_url: '' },
  { name: 'Leg Press', muscle_group: 'legs', equipment: 'machine', difficulty: 'beginner', video_url: '' },
  { name: 'Lunges', muscle_group: 'legs', equipment: 'dumbbell', difficulty: 'intermediate', video_url: '' },
  { name: 'Leg Extensions', muscle_group: 'legs', equipment: 'machine', difficulty: 'beginner', video_url: '' },
  { name: 'Leg Curls', muscle_group: 'legs', equipment: 'machine', difficulty: 'beginner', video_url: '' },
  { name: 'Front Squat', muscle_group: 'legs', equipment: 'barbell', difficulty: 'advanced', video_url: '' },
  { name: 'Romanian Deadlift', muscle_group: 'legs', equipment: 'barbell', difficulty: 'intermediate', video_url: '' },
  { name: 'Bulgarian Split Squat', muscle_group: 'legs', equipment: 'dumbbell', difficulty: 'intermediate', video_url: '' },
  { name: 'Barbell Hip Thrust', muscle_group: 'legs', equipment: 'barbell', difficulty: 'intermediate', video_url: '' },
  { name: 'Standing Calf Raises', muscle_group: 'legs', equipment: 'machine', difficulty: 'beginner', video_url: '' },
  { name: 'Goblet Squat', muscle_group: 'legs', equipment: 'dumbbell', difficulty: 'beginner', video_url: '' },
  { name: 'Hack Squat', muscle_group: 'legs', equipment: 'machine', difficulty: 'intermediate', video_url: '' },

  // BICEPS
  { name: 'Barbell Curl', muscle_group: 'biceps', equipment: 'barbell', difficulty: 'beginner', video_url: '' },
  { name: 'Hammer Curls', muscle_group: 'biceps', equipment: 'dumbbell', difficulty: 'beginner', video_url: '' },
  { name: 'Preacher Curl', muscle_group: 'biceps', equipment: 'machine', difficulty: 'intermediate', video_url: '' },
  { name: 'Concentration Curls', muscle_group: 'biceps', equipment: 'dumbbell', difficulty: 'beginner', video_url: '' },
  { name: 'Incline Dumbbell Curl', muscle_group: 'biceps', equipment: 'dumbbell', difficulty: 'intermediate', video_url: '' },
  { name: 'Cable Bicep Curl', muscle_group: 'biceps', equipment: 'cable', difficulty: 'beginner', video_url: '' },
  { name: 'EZ-Bar Bicep Curl', muscle_group: 'biceps', equipment: 'barbell', difficulty: 'beginner', video_url: '' },

  // TRICEPS
  { name: 'Tricep Pushdown', muscle_group: 'triceps', equipment: 'cable', difficulty: 'beginner', video_url: '' },
  { name: 'Skull Crushers', muscle_group: 'triceps', equipment: 'barbell', difficulty: 'intermediate', video_url: '' },
  { name: 'Overhead Tricep Extension', muscle_group: 'triceps', equipment: 'dumbbell', difficulty: 'intermediate', video_url: '' },
  { name: 'Dips', muscle_group: 'triceps', equipment: 'bodyweight', difficulty: 'advanced', video_url: '' },
  { name: 'Close-Grip Bench Press', muscle_group: 'triceps', equipment: 'barbell', difficulty: 'intermediate', video_url: '' },
  { name: 'Cable Overhead Tricep Extension', muscle_group: 'triceps', equipment: 'cable', difficulty: 'beginner', video_url: '' },
  { name: 'Kickbacks', muscle_group: 'triceps', equipment: 'dumbbell', difficulty: 'beginner', video_url: '' },

  // CORE
  { name: 'Crunches', muscle_group: 'core', equipment: 'bodyweight', difficulty: 'beginner', video_url: '' },
  { name: 'Plank', muscle_group: 'core', equipment: 'bodyweight', difficulty: 'beginner', video_url: '' },
  { name: 'Russian Twists', muscle_group: 'core', equipment: 'bodyweight', difficulty: 'intermediate', video_url: '' },
  { name: 'Leg Raises', muscle_group: 'core', equipment: 'bodyweight', difficulty: 'intermediate', video_url: '' },
  { name: 'Cable Crunches', muscle_group: 'core', equipment: 'cable', difficulty: 'intermediate', video_url: '' },
  { name: 'Hanging Leg Raises', muscle_group: 'core', equipment: 'bodyweight', difficulty: 'advanced', video_url: '' },
  { name: 'Ab Wheel Rollout', muscle_group: 'core', equipment: 'bodyweight', difficulty: 'advanced', video_url: '' },
  { name: 'Dead Bug', muscle_group: 'core', equipment: 'bodyweight', difficulty: 'beginner', video_url: '' }
];

async function main() {
  console.log('Start seeding expanded exercise library...');
  for (const ex of exercises) {
    const existing = await prisma.exercise.findFirst({
      where: { name: ex.name }
    });

    if (!existing) {
      await prisma.exercise.create({
        data: {
          name: ex.name,
          muscle_group: ex.muscle_group,
          equipment: ex.equipment,
          difficulty: ex.difficulty,
          secondary_muscles: [],
          video_url: ex.video_url || null
        }
      });
    } else {
      await prisma.exercise.update({
        where: { id: existing.id },
        data: {
          muscle_group: ex.muscle_group,
          equipment: ex.equipment,
          difficulty: ex.difficulty,
          video_url: ex.video_url || null
        }
      });
    }
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
