// services/gptService/templates.js
/**
 * Templates for formatting search responses and other structured content
 */

// Template for Chinese search responses
const searchAnswerZhTemplate = `# The following content is based on search results for the message sent by the user:
{search_results}
In the search results I provided, each result is in the format [webpage X begin]...[webpage X end], where X represents the numerical index of each article. Please cite the context appropriately at the end of sentences when relevant. Please cite the context in your answer using the citation format [citation:X] in corresponding parts. If a sentence derives from multiple contexts, please list all relevant citation numbers, for example [citation:3][citation:5].

When answering, please note the following points:
- Today is {cur_date}.
- Must extract information from multiple different news sources or webpages, don't rely solely on a single source.
- For news content, pay attention to information timeliness and prioritize the latest information sources.
- For each important point, cite at least 2-3 different sources to ensure information reliability.
- For time-sensitive content, clearly indicate the publication time of the information.
- Information classification and organization should be clear and organized, using subtitles or bullet points to structure content.
- If information from different sources conflicts, point out these differences and explain possible reasons.
- When appropriate, add a "Further Reading" section providing links to more related resources.
- Unless requested by the user, your answer language should be consistent with the user's question language.

# User message:
{question}`;

// Template for English search responses
const searchAnswerEnTemplate = `# The following contents are the search results related to the user's message:
{search_results}
In the search results I provide to you, each result is formatted as [webpage X begin]...[webpage X end], where X represents the numerical index of each article. Please cite the context at the end of the relevant sentence when appropriate. Use the citation format [citation:X] in the corresponding part of your answer. If a sentence is derived from multiple contexts, list all relevant citation numbers, such as [citation:3][citation:5]. Be sure not to cluster all citations at the end; instead, include them in the corresponding parts of the answer.
When responding, please keep the following points in mind:
- Today is {cur_date}.
- Not all content in the search results is closely related to the user's question. You need to evaluate and filter the search results based on the question.
- For listing-type questions, try to limit the answer to 10 key points and inform the user that they can refer to the search sources for complete information. Prioritize providing the most complete and relevant items in the list. Avoid mentioning content not provided in the search results unless necessary.
- For creative tasks, ensure that references are cited within the body of the text, such as [citation:3][citation:5], rather than only at the end of the text. You need to interpret and summarize the user's requirements, choose an appropriate format, fully utilize the search results, extract key information, and generate an answer that is insightful, creative, and professional. Extend the length of your response as much as possible, addressing each point in detail and from multiple perspectives, ensuring the content is rich and thorough.
- If the response is lengthy, structure it well and summarize it in paragraphs. If a point-by-point format is needed, try to limit it to 5 points and merge related content.
- For objective Q&A, if the answer is very brief, you may add one or two related sentences to enrich the content.
- Choose an appropriate and visually appealing format for your response based on the user's requirements and the content of the answer, ensuring strong readability.
- Your answer should synthesize information from multiple relevant webpages and avoid repeatedly citing the same webpage.
- Unless the user requests otherwise, your response should be in the same language as the user's question.

# The user's message is:
{question}`;

// Format helper for search results
const formatSearchResults = (results) => {
    return results.map((result, index) => {
        return `[webpage ${index + 1} begin]
Title: ${result.title}
Content: ${result.snippet}
URL: ${result.url}
[webpage ${index + 1} end]
`;
    }).join("\n\n");
};

module.exports = {
    searchAnswerZhTemplate,
    searchAnswerEnTemplate,
    formatSearchResults
};