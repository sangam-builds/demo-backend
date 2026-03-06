const taskModel = require('../models/taskModel');

function isObjectIdError(error) {
  return error && error.name === 'CastError';
}

async function getAllTasks(req, res) {
  try {
    const tasks = await taskModel.find().sort({ createdAt: -1 });
    return res.status(200).json(tasks);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch tasks' });
  }
}

async function getTaskById(req, res) {
  try {
    const task = await taskModel.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.status(200).json(task);
  } catch (error) {
    if (isObjectIdError(error)) {
      return res.status(400).json({ message: 'Invalid task id' });
    }

    return res.status(500).json({ message: 'Failed to fetch task' });
  }
}

async function createTask(req, res) {
  const { title, completed = false } = req.body;

  if (!title || typeof title !== 'string') {
    return res.status(400).json({ message: 'title is required and must be a string' });
  }

  try {
    const newTask = await taskModel.create({
      title: title.trim(),
      completed: Boolean(completed),
    });

    return res.status(201).json(newTask);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create task' });
  }
}

async function updateTask(req, res) {
  const { title, completed } = req.body;

  if (title !== undefined && typeof title !== 'string') {
    return res.status(400).json({ message: 'title must be a string when provided' });
  }

  if (completed !== undefined && typeof completed !== 'boolean') {
    return res.status(400).json({ message: 'completed must be a boolean when provided' });
  }

  try {
    const updatedTask = await taskModel.findByIdAndUpdate(
      req.params.id,
      {
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(completed !== undefined ? { completed } : {}),
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.status(200).json(updatedTask);
  } catch (error) {
    if (isObjectIdError(error)) {
      return res.status(400).json({ message: 'Invalid task id' });
    }

    return res.status(500).json({ message: 'Failed to update task' });
  }
}

async function deleteTask(req, res) {
  try {
    const deletedTask = await taskModel.findByIdAndDelete(req.params.id);

    if (!deletedTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.status(204).send();
  } catch (error) {
    if (isObjectIdError(error)) {
      return res.status(400).json({ message: 'Invalid task id' });
    }

    return res.status(500).json({ message: 'Failed to delete task' });
  }
}

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
};
