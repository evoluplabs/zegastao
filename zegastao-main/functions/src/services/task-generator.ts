// Gera tarefas diárias de renda extra / economia com base nas habilidades e fase.
// Usa Sonnet 1x/dia (no job noturno) — contexto curto, saída estruturada.
import Anthropic from '@anthropic-ai/sdk';
import { FinancialPhase } from './phase-engine';

export interface DailyTask {
  title: string;
  category: 'renda_extra' | 'economia' | 'aprendizado' | 'investimento';
  estimatedTime: string;
  estimatedReturn?: string;
  platform?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

const PHASE_FOCUS: Record<FinancialPhase, string> = {
  survival: 'renda extra rápida e cortar gastos. Nada de investimento.',
  reorganizing: 'renda extra para acelerar a quitação de dívidas e economia.',
  stabilizing: 'renda extra e formar reserva de emergência.',
  accumulating: 'renda extra, aprendizado e começar a investir aos poucos.',
  growing: 'otimizar investimentos, aprendizado e renda passiva.',
};

export async function generateDailyTasks(
  phase: FinancialPhase,
  skills: string[]
): Promise<DailyTask[]> {
  const client = new Anthropic();
  const skillsText = skills.length ? skills.join(', ') : 'habilidades gerais';

  const prompt = `Gere de 2 a 3 tarefas concretas e acionáveis para HOJE para um usuário brasileiro.
Habilidades do usuário: ${skillsText}.
Foco da fase atual: ${PHASE_FOCUS[phase]}
Cada tarefa deve ser realista, com plataforma brasileira real quando fizer sentido
(GetNinjas, Workana, 99Freelas, OLX, Enjoei, Alura, etc.).

Responda APENAS com JSON:
{"tasks":[{"title":"...","category":"renda_extra|economia|aprendizado|investimento","estimatedTime":"30min","estimatedReturn":"R$ 50-200","platform":"...","difficulty":"easy|medium|hard"}]}`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const data = JSON.parse(text.replace(/```json|```/g, '').trim());
    return Array.isArray(data.tasks) ? data.tasks.slice(0, 3) : [];
  } catch (e) {
    console.error('generateDailyTasks failed:', e);
    return [];
  }
}
