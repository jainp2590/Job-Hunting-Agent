const { CareerAgentPipeline } = require("../../src/agents/CareerAgentPipeline");

describe("CareerAgentPipeline (TC-EDGE-002)", () => {
  const pipeline = new CareerAgentPipeline({ match_threshold: 75 });

  test("TC-EDGE-002: Job with empty title and description does not throw", () => {
    const profile = {
      summary: "Engineer",
      headline: "Backend",
      skills: ["Node.js"],
      experiences: [
        {
          title: "Engineer",
          company: "Co",
          description: "Node.js work.",
          technologies: ["Node.js"],
          years: 3,
        },
      ],
    };
    const job = {
      title: "",
      company_name: "",
      location: "",
      description: "",
    };
    const result = pipeline.processJob(profile, job);
    expect(result).toHaveProperty("job_match_score");
    expect(result).toHaveProperty("decision");
    expect(result).toHaveProperty("reasoning");
    expect(result).toHaveProperty("cover_letter_draft");
  });
});
