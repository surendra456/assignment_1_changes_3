const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());
const format = require("date-fns/format");
const isValid = require("date-fns/isValid");

const dbPath = path.join(__dirname, "todoApplication.db");
let db = null;
const initializeDbAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("server running at http://localhost/3000");
    });
  } catch (e) {
    console.log(`DB ERROR : ${e}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const dbObjectIntoResponse = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    status: dbObject.status,
    category: dbObject.category,
    dueDate: dbObject.due_date,
  };
};
let name = "";

function verificationDate(query) {
  if (isValid(query)) {
    return true;
  } else {
    name = "due Date";
    return false;
  }
}

function verificationStatus(query) {
  if (query === "TO DO" || query === "IN PROGRESS" || query === "DONE") {
    return true;
  } else {
    name = "Status";
    return false;
  }
}

function verificationCategory(query) {
  if (query === "WORK" || query === "HOME" || query === "LEARNING") {
    return true;
  } else {
    name = "Category";
    return false;
  }
}

function verificationPriority(query) {
  if (query === "HIGH" || query === "MEDIUM" || query === "LOW") {
    return true;
  } else {
    name = "Priority";
    return false;
  }
}
const hasPriorityAndStatusProperties = (requestQuery) => {
  if (
    requestQuery.priority !== undefined &&
    requestQuery.status !== undefined
  ) {
    if (
      verificationPriority(requestQuery.priority) &&
      verificationStatus(requestQuery.status)
    ) {
      return true;
    } else {
      return name;
    }
  }
};

const hasPriorityProperty = (requestQuery) => {
  if (requestQuery.priority !== undefined) {
    if (verificationPriority(requestQuery.priority)) {
      return true;
    } else {
      return name;
    }
  }
};

const hasSearchProperty = (requestQuery) => {
  return requestQuery.search_q !== undefined;
};

const hasStatusProperty = (requestQuery) => {
  if (requestQuery.status !== undefined) {
    if (verificationStatus(requestQuery.status)) {
      return true;
    } else {
      return name;
    }
  }
};

const hasCategoryStatusProperty = (requestQuery) => {
  if (
    requestQuery.status !== undefined &&
    requestQuery.category !== undefined
  ) {
    if (verificationCategory(requestQuery.category)) {
      return true;
    } else {
      return name;
    }
  }
};

const hasCategoryProperty = (requestQuery) => {
  if (requestQuery.category !== undefined) {
    if (verificationCategory(requestQuery.category)) {
      return true;
    } else {
      return name;
    }
  }
};

const hasCategoryPriorityProperty = (requestQuery) => {
  if (
    requestQuery.category !== undefined &&
    requestQuery.priority !== undefined
  ) {
    if (
      verificationCategory(requestQuery.category) &&
      verificationPriority(requestQuery.priority)
    ) {
      return true;
    } else {
      return name;
    }
  }
};

app.get("/todos/", async (request, response) => {
  const { status, priority, search_q = "", category } = request.query;
  let getTodosQuery = " ";
  switch (true) {
    case hasPriorityAndStatusProperties(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND priority = '${priority}';`;
      break;
    case hasCategoryStatusProperty(request.query):
      getTodosQuery = `
        SELECT 
        *
        FROM
        todo
        WHERE
        todo LIKE '%${search_q}%'
        AND category = '${category}'
        AND status = '${status}';`;
      break;
    case hasPriorityProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND priority = '${priority}';`;
      break;
    case hasStatusProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}';`;
      break;
    case hasCategoryProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND category = '${category}';`;
      break;
    case hasCategoryPriorityProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND category = '${category}'
        AND priority = '${priority}';`;
      break;
    case hasSearchProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%';`;
      break;
    default:
      response.status(400);
      response.send(`Invalid Todo ${name}`);
  }

  const data = await db.all(getTodosQuery);
  response.send(data.map((each) => dbObjectIntoResponse(each)));
});
/// API 2

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const specificTodoQuery = `
    SELECT * FROM todo WHERE id = ${todoId};`;
  const query = await db.get(specificTodoQuery);
  response.send(dbObjectIntoResponse(query));
});

// API 3

app.get("/agenda/", async (request, response) => {
  let { date } = request.query;

  if (verificationDate(parseISO(date))) {
    const getDateQuery = `
        SELECT * FROM todo WHERE due_date  = '${date}';`;
    const dateQuery = await db.all(getDateQuery);
    response.send(dateQuery.map((each) => dbObjectIntoResponse(each)));
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

/// API 4
app.post("/todos/", async (request, response) => {
  let { id, todo, priority, status, category, dueDate } = request.body;
  const formatDate = format(new Date(dueDate), "yyyy-MM-dd");
  const getTodoQuery = `
    SELECT * FROM todo WHERE id = ${request.body.id};`;
  const previousTodo = await db.get(getTodoQuery);

  if (previousTodo === undefined) {
    if (!verificationPriority(request.body.priority)) {
      response.status(400);
      response.send("Invalid Todo Priority");
    } else if (!verificationStatus(request.body.status)) {
      response.status(400);
      response.send("Invalid Todo Status");
    } else if (!verificationCategory(request.body.category)) {
      response.status(400);
      response.send("Invalid Todo Category");
    } else if (!verificationDate(new Date(formatDate))) {
      response.status(400);
      response.send("Invalid Due Date");
    } else {
      const postQuery = `INSERT INTO todo(id,todo,priority,status,category,due_date)
    VALUES (${id},'${todo}','${priority}','${status}','${category}','${formatDate}');`;
      const updateQuery = await db.run(postQuery);
      response.send("Todo Successfully Added");
    }
  } else {
    response.status(400);
    response.send("Todo Id Already Exists");
  }
});

/// API 5

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;

  let updateColumn = "";

  const requestBody = request.body;

  switch (true) {
    case requestBody.status !== undefined:
      if (!verificationStatus(requestBody.status)) {
        response.status(400);
        response.send("Invalid Todo Status");
      } else {
        updateColumn = "Status";
      }
      break;
    case requestBody.priority !== undefined:
      if (!verificationPriority(requestBody.priority)) {
        response.status(400);
        response.send("Invalid Todo Priority");
      } else {
        updateColumn = "Priority";
      }
      break;
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
    case requestBody.category !== undefined:
      if (!verificationCategory(requestBody.category)) {
        response.status(400);
        response.send("Invalid Todo Category");
      } else {
        updateColumn = "Category";
      }

      break;
    case requestBody.dueDate !== undefined:
      let dueDate = new Date(requestBody.dueDate);
      if (!verificationDate(dueDate)) {
        response.status(400);
        response.send("Invalid Due Date");
      } else {
        updateColumn = "Due Date";
      }
  }
  const previousTodoQuery = `
    SELECT * FROM todo WHERE id = ${todoId};`;
  const previousTodo = await db.get(previousTodoQuery);

  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.dueDate,
  } = request.body;

  const updateTodoQuery = `UPDATE todo 
    SET todo = '${todo}',
    priority = '${priority}',
    status = '${status}',
    category = '${category}',
    due_date = '${dueDate}'
    WHERE id = ${todoId};`;
  await db.run(updateTodoQuery);
  response.send(`${updateColumn} Updated`);
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteQuery = `DELETE FROM todo WHERE id = ${todoId};`;
  await db.run(deleteQuery);
  response.send("Todo Deleted");
});

module.exports = app;
