const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  SlideType,
  isValidSlideConfig,
  isValidSlideResponse,
  getSlideConfigValidationErrors,
  getSlideResponseValidationErrors
} = require("../dist");

const validConfigByType = {
  [SlideType.MultipleChoice]: {
    options: [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "c", label: "C" }
    ],
    allowMultiple: false
  },
  [SlideType.WordCloud]: {
    inputCount: 3,
    maxWordLength: 20
  },
  [SlideType.OpenEnded]: {
    maxLength: 500
  },
  [SlideType.Scales]: {
    min: 1,
    max: 5,
    minLabel: "Low",
    maxLabel: "High",
    step: 1
  },
  [SlideType.Ranking]: {
    items: [
      { id: "first", label: "First" },
      { id: "second", label: "Second" },
      { id: "third", label: "Third" }
    ]
  },
  [SlideType.GuessTheNumber]: {
    min: 1,
    max: 100,
    correctValue: 42
  },
  [SlideType.TwoByTwo]: {
    xMin: -10,
    xMax: 10,
    yMin: -5,
    yMax: 5,
    xMinLabel: "Left",
    xMaxLabel: "Right",
    yMinLabel: "Bottom",
    yMaxLabel: "Top"
  }
};

const validResponseByType = {
  [SlideType.MultipleChoice]: {
    selectedOptionIds: ["a"]
  },
  [SlideType.WordCloud]: {
    words: ["alpha", "beta"]
  },
  [SlideType.OpenEnded]: {
    text: "Long-form answer"
  },
  [SlideType.Scales]: {
    value: 3
  },
  [SlideType.Ranking]: {
    orderedItemIds: ["first", "second", "third"]
  },
  [SlideType.GuessTheNumber]: {
    guess: 42
  },
  [SlideType.TwoByTwo]: {
    x: 2,
    y: 1
  }
};

test("does not expose Q&A as a slide type", () => {
  assert.equal(Object.values(SlideType).includes("Q_AND_A"), false);
});

test("accepts valid configs and responses for every slide type", () => {
  for (const type of Object.values(SlideType)) {
    const config = validConfigByType[type];
    const response = validResponseByType[type];

    assert.equal(
      isValidSlideConfig(type, config),
      true,
      `${type} config should be valid`
    );
    assert.equal(
      isValidSlideResponse(type, config, response),
      true,
      `${type} response should be valid`
    );
  }
});

test("rejects unknown config keys", () => {
  const errors = getSlideConfigValidationErrors(SlideType.OpenEnded, {
    maxLength: 100,
    extra: true
  });

  assert.deepEqual(errors, ["extra is not allowed"]);
});

test("enforces product count limits for authoring configs", () => {
  assert.deepEqual(
    getSlideConfigValidationErrors(SlideType.MultipleChoice, {
      options: [
        { id: "a", label: "A" },
        { id: "b", label: "B" }
      ],
      allowMultiple: false
    }),
    ["options must include between 3 and 7 items"]
  );

  assert.deepEqual(
    getSlideConfigValidationErrors(SlideType.WordCloud, {
      inputCount: 4,
      maxWordLength: 20
    }),
    ["inputCount must be an integer between 1 and 3"]
  );

  assert.deepEqual(
    getSlideConfigValidationErrors(SlideType.Ranking, {
      items: [
        { id: "a", label: "A" },
        { id: "b", label: "B" }
      ]
    }),
    ["items must include between 3 and 6 items"]
  );
});

test("rejects response ids outside the configured options", () => {
  const errors = getSlideResponseValidationErrors(
    SlideType.MultipleChoice,
    validConfigByType[SlideType.MultipleChoice],
    {
      selectedOptionIds: ["missing"]
    }
  );

  assert.deepEqual(errors, ["selectedOptionIds contains an unknown option id"]);
});

test("rejects ranking responses that omit configured items", () => {
  const errors = getSlideResponseValidationErrors(
    SlideType.Ranking,
    validConfigByType[SlideType.Ranking],
    {
      orderedItemIds: ["first"]
    }
  );

  assert.deepEqual(errors, ["orderedItemIds must include every item exactly once"]);
});
