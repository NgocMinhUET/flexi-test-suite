import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Challenge templates for auto-generation
const CHALLENGE_TEMPLATES = [
  { type: 'questions_count', targets: [10, 15, 20, 30], descriptions: ['Hoàn thành {n} câu hỏi', 'Trả lời {n} câu hỏi hôm nay'], baseXP: 30 },
  { type: 'accuracy', targets: [70, 80, 90], descriptions: ['Đạt {n}% độ chính xác (tối thiểu 10 câu)', 'Chính xác {n}% trong 10 câu trở lên'], baseXP: 50 },
  { type: 'streak_keep', targets: [1], descriptions: ['Duy trì streak hôm nay', 'Giữ ngọn lửa streak cháy'], baseXP: 25 },
  { type: 'time_spent', targets: [15, 30, 45], descriptions: ['Luyện tập {n} phút', 'Học liên tục {n} phút'], baseXP: 40 },
  { type: 'perfect_session', targets: [1, 2], descriptions: ['Hoàn thành {n} phiên 100% chính xác', '{n} phiên perfect'], baseXP: 80 },
];

function selectRandomChallenges(count: number = 3): Array<{
  challenge_type: string;
  target_value: number;
  description: string;
  xp_reward: number;
  bonus_multiplier: number;
}> {
  const shuffled = [...CHALLENGE_TEMPLATES].sort(() => Math.random() - 0.5);
  const selected: Array<{
    challenge_type: string;
    target_value: number;
    description: string;
    xp_reward: number;
    bonus_multiplier: number;
  }> = [];

  for (let i = 0; i < count && i < shuffled.length; i++) {
    const template = shuffled[i];
    const targetIndex = Math.floor(Math.random() * template.targets.length);
    const target = template.targets[targetIndex];
    const descIndex = Math.floor(Math.random() * template.descriptions.length);
    let description = template.descriptions[descIndex].replace('{n}', String(target));

    // Bonus multiplier increases with difficulty
    const bonusMultiplier = 1 + (targetIndex * 0.1);
    const xpReward = Math.round(template.baseXP * (1 + targetIndex * 0.3));

    selected.push({
      challenge_type: template.type,
      target_value: target,
      description,
      xp_reward: xpReward,
      bonus_multiplier: bonusMultiplier
    });
  }

  return selected;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split('T')[0];

    // Check if challenges already exist for today
    const { data: existing, error: checkError } = await supabase
      .from('daily_challenges')
      .select('id')
      .eq('challenge_date', today)
      .limit(1);

    if (checkError) {
      console.error('Error checking existing challenges:', checkError);
      throw checkError;
    }

    if (existing && existing.length > 0) {
      console.log('Challenges already exist for today');
      return new Response(
        JSON.stringify({ message: 'Challenges already exist for today', date: today }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate new challenges
    const challenges = selectRandomChallenges(3);
    const challengesWithDate = challenges.map(c => ({
      ...c,
      challenge_date: today
    }));

    console.log('Generating challenges for', today, ':', challengesWithDate);

    const { data: inserted, error: insertError } = await supabase
      .from('daily_challenges')
      .insert(challengesWithDate)
      .select();

    if (insertError) {
      console.error('Error inserting challenges:', insertError);
      throw insertError;
    }

    console.log('Successfully created', inserted?.length, 'challenges');

    return new Response(
      JSON.stringify({ 
        message: 'Daily challenges generated successfully',
        date: today,
        challenges: inserted 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in generate-daily-challenges:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
