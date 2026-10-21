const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");

const controllerPath = path.resolve(
  __dirname,
  "../src/controllers/interview.controller.js",
);

const loadController = ({ pdfParser, aiService, reportModel }) => {
  const originalLoad = Module._load;
  delete require.cache[controllerPath];

  Module._load = function loadWithControllerMocks(request, parent, isMain) {
    if (parent?.filename === controllerPath && request === "pdf-parse") {
      return pdfParser;
    }
    if (parent?.filename === controllerPath && request === "../services/ai.service") {
      return aiService;
    }
    if (
      parent?.filename === controllerPath &&
      request === "../models/interviewReport.model"
    ) {
      return reportModel;
    }
    if (
      parent?.filename === controllerPath &&
      request === "../utils/requestDiagnostics"
    ) {
      return { logRequestFailure() {} };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require(controllerPath);
  } finally {
    Module._load = originalLoad;
  }
};

const makeResponse = () => ({
  statusCode: null,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const createRequest = () => ({
  body: {
    jobDescription: "Frontend Engineer",
    selfDescription: "",
  },
  file: {
    buffer: Buffer.from("%PDF-1.7 test content"),
    mimetype: "application/pdf",
    originalname: "candidate.pdf",
  },
  user: { id: "user-1" },
  requestId: "test-request-id",
});

test("returns a safe client error when PDF parsing fails before AI generation", async () => {
  let aiWasCalled = false;
  class PDFParse {
    constructor(options) {
      assert.ok(options.data instanceof Uint8Array);
    }

    async getText() {
      throw new Error("private parser details");
    }
  }
  const controller = loadController({
    pdfParser: { PDFParse },
    aiService: {
      async generateInterviewReport() {
        aiWasCalled = true;
      },
    },
    reportModel: { async create() { throw new Error("unexpected"); } },
  });
  const req = createRequest();
  const res = makeResponse();

  await controller.generateInterViewReportController(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /couldn't read this PDF/i);
  assert.equal(aiWasCalled, false);
});

test("rejects PDFs with no extracted text when no self-description is provided", async () => {
  let aiWasCalled = false;
  class PDFParse {
    constructor(options) {
      assert.ok(options.data instanceof Uint8Array);
    }

    async getText() {
      return { text: "   " };
    }
  }
  const controller = loadController({
    pdfParser: { PDFParse },
    aiService: {
      async generateInterviewReport() {
        aiWasCalled = true;
      },
    },
    reportModel: { async create() { throw new Error("unexpected"); } },
  });
  const req = createRequest();
  const res = makeResponse();

  await controller.generateInterViewReportController(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /readable text/i);
  assert.equal(aiWasCalled, false);
});

test("persists the generated report for the authenticated user and returns 201", async () => {
  class PDFParse {
    constructor(options) {
      assert.ok(options.data instanceof Uint8Array);
    }

    async getText() {
      return { text: "Extracted resume text" };
    }
  }
  let generationInput;
  let persistenceInput;
  const generatedReport = {
    title: "Frontend Engineer",
    matchScore: 78,
  };
  const controller = loadController({
    pdfParser: { PDFParse },
    aiService: {
      async generateInterviewReport(input) {
        generationInput = input;
        return generatedReport;
      },
    },
    reportModel: {
      async create(input) {
        persistenceInput = input;
        return { _id: "report-1", ...input };
      },
    },
  });
  const req = createRequest();
  const res = makeResponse();

  await controller.generateInterViewReportController(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.interviewReport._id, "report-1");
  assert.deepEqual(generationInput, {
    resume: "Extracted resume text",
    selfDescription: "",
    jobDescription: "Frontend Engineer",
  });
  assert.equal(persistenceInput.user, "user-1");
  assert.equal(persistenceInput.resume, "Extracted resume text");
});

test("reports persistence failures without converting them to success", async () => {
  class PDFParse {
    constructor(options) {
      assert.ok(options.data instanceof Uint8Array);
    }

    async getText() {
      return { text: "Extracted resume text" };
    }
  }
  const controller = loadController({
    pdfParser: { PDFParse },
    aiService: {
      async generateInterviewReport() {
        return { title: "Frontend Engineer" };
      },
    },
    reportModel: {
      async create() {
        throw Object.assign(new Error("private database details"), {
          name: "MongoServerSelectionError",
        });
      },
    },
  });
  const req = createRequest();
  const res = makeResponse();
  let forwardedError;

  await controller.generateInterViewReportController(req, res, (error) => {
    forwardedError = error;
  });

  assert.equal(res.statusCode, null);
  assert.equal(forwardedError.failureCode, "REPORT_DATABASE_UNAVAILABLE");
  assert.equal(forwardedError.httpStatus, 503);
  assert.equal(
    forwardedError.publicMessage.includes("private database"),
    false,
  );
});
