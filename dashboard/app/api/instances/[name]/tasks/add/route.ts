import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function isPathAllowed(instancePath: string): boolean {
  const allowedParent = '/Users/alexander/claude-managers';
  const normalizedPath = path.normalize(instancePath);
  return normalizedPath.startsWith(allowedParent);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const instanceName = decodeURIComponent(params.name);
    const body = await request.json();
    const { quickInput, type } = body; // type: 'feature' | 'bug' | 'task'

    if (!quickInput) {
      return NextResponse.json(
        { error: 'Quick input is required' },
        { status: 400 }
      );
    }

    // Find instance
    const managersDir = '/Users/alexander/claude-managers';
    const instancePath = path.join(managersDir, instanceName);

    if (!isPathAllowed(instancePath)) {
      return NextResponse.json(
        { error: 'Invalid instance path' },
        { status: 403 }
      );
    }

    const tasksFile = path.join(instancePath, 'prds', 'tasks.json');

    // Check if tasks.json exists
    try {
      await fs.access(tasksFile);
    } catch {
      return NextResponse.json(
        { error: 'tasks.json not found. Please create it first.' },
        { status: 404 }
      );
    }

    // Read existing tasks
    const tasksContent = await fs.readFile(tasksFile, 'utf-8');
    const tasksData = JSON.parse(tasksContent);

    // Get next task ID
    const existingIds = tasksData.tasks.map((t: any) => parseInt(t.id)).filter((id: number) => !isNaN(id));
    const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;

    // Use AI to expand the quick input into a full task
    const typeContext = {
      feature: 'This is a new feature request',
      bug: 'This is a bug fix',
      task: 'This is a general task',
    }[type] || 'This is a task';

    const prompt = `You are helping convert a quick task input into a structured task for a development project.

Project: ${tasksData.projectName || instanceName}

${typeContext}: "${quickInput}"

Create a well-structured task with:
1. A clear, concise title (5-10 words)
2. A detailed description (2-3 sentences explaining what needs to be done)
3. Specific acceptance criteria (how to verify it's complete)
4. Estimated iterations (1-5, be realistic)

Respond ONLY with valid JSON in this exact format:
{
  "title": "Title here",
  "description": "Description here",
  "acceptanceCriteria": "Acceptance criteria here",
  "estimatedIterations": 2
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Extract JSON from response
    let taskData;
    try {
      // Try to find JSON in the response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        taskData = JSON.parse(jsonMatch[0]);
      } else {
        taskData = JSON.parse(content.text);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content.text);
      // Fallback: create task manually
      taskData = {
        title: quickInput.slice(0, 80),
        description: quickInput,
        acceptanceCriteria: 'Task completed successfully',
        estimatedIterations: 2,
      };
    }

    // Create new task
    const newTask = {
      id: nextId.toString(),
      title: taskData.title,
      description: taskData.description,
      acceptanceCriteria: taskData.acceptanceCriteria,
      status: 'pending',
      estimatedIterations: taskData.estimatedIterations || 2,
      dependencies: [],
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
    };

    // Add task to list
    tasksData.tasks.push(newTask);

    // Write back to file
    await fs.writeFile(tasksFile, JSON.stringify(tasksData, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      task: newTask,
      message: 'Task added successfully',
    });
  } catch (error: any) {
    console.error('Error adding task:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add task' },
      { status: 500 }
    );
  }
}
