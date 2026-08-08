# Testing Guidelines

This document captures the testing style used in this repository and defines the conventions to follow when writing new tests.

## 1. Prefer integration tests for API behavior

Write tests around real HTTP routes and real application behavior whenever possible.

- Use Vitest with Supertest for endpoint-level testing.
- Test the full request/response flow, including status codes, response body, headers, and cookies.
- Prefer integration tests over isolated unit tests for controllers and routes.

## 2. Organize tests by endpoint or feature

Group related tests under a descriptive `describe()` block.

- Use names such as `describe("/auth/login POST route")` or `describe("Profile integration tests")`.
- Keep tests focused on one behavior per case.

## 3. Use clear and consistent test names

Test names should be explicit and readable.

- Prefer formats like:
    - `should return 400 if ...`
    - `should return 401 when ...`
    - `should create a ...`
    - `should not allow ...`
- The name should describe the expected outcome and the scenario.

## 4. Set up test data before each test suite

Use `beforeAll()` to prepare the environment for the test suite.

- Mock tenant resolution when required.
- Initialize the test database with `setupTestDatabase(...)`.
- Create the minimum required users, roles, sessions, or other entities needed for the scenario.

## 5. Make tests deterministic and isolated

Each test should be self-contained and not depend on side effects from another test.

- Create required data inside the setup phase or inside the test itself.
- Avoid hidden dependencies between tests.
- If a test mutates data, make sure the next test still has a valid setup.

## 6. Assert the real contract, not implementation details

Focus on observable behavior.

- Assert response status codes.
- Assert meaningful fields in the response body.
- Assert headers when they are part of the behavior, such as cookies or auth headers.
- Avoid over-asserting internal implementation details.

## 7. Cover both success and failure paths

Every important endpoint should be tested for:

- successful behavior
- validation errors
- authentication failures
- authorization failures
- tenant isolation issues
- invalid input and invalid identifiers

## 8. Test authentication and tenant boundaries explicitly

Authentication and multi-tenant behavior are important parts of this project.

- Verify that requests without a valid token are rejected.
- Verify that tokens from one tenant cannot be used in another tenant.
- Test the host/domain header to simulate tenant context.
- Check cookie behavior when auth is established or cleared.

## 9. Use realistic request payloads

Tests should resemble real user behavior.

- Send real field names and realistic values.
- Include edge cases such as missing fields, invalid IDs, invalid pagination values, and empty input.

## 10. Verify side effects when relevant

When the behavior changes stored data, assert that change directly.

- Check that a record was created, updated, deleted, or marked inactive.
- Verify soft-delete behavior when applicable.

## 11. Restore mocks after the suite

If mocks are used, clean them up after the test suite.

- Use `afterAll()` with `vi.restoreAllMocks()` when necessary.

## 12. Keep tests concise and readable

A good test should be easy to understand at a glance.

- Use short setup blocks.
- Avoid unnecessary comments unless they clarify a non-obvious scenario.
- Prefer simple, direct assertions.

## 13. Example structure for a new test

```ts
describe("/some/endpoint", () => {
    beforeAll(async () => {
        // prepare tenant context
        // initialize database
        // create required test data
    });

    it("should return 200 when ...", async () => {
        const res = await request(app)
            .get("/some/endpoint")
            .set("host", "localhost")
            .set("Cookie", authCookie);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("data");
    });
});
```

## 14. Core rule of thumb

Write tests that answer this question clearly:

- “What should the system do in this scenario, and what should the user observe?”

If a test cannot explain the expected behavior in a simple sentence, it should be simplified.
