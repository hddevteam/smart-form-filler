// services/gptService/templates.js
/**
 * Templates for formatting search responses and other structured content
 */

// Template for Chinese search responses
const searchAnswerZhTemplate = `# 以下内容是基于用户发送的消息的搜索结果:
{search_results}
在我给你的搜索结果中，每个结果都是[webpage X begin]...[webpage X end]格式的，X代表每篇文章的数字索引。请在适当的情况下在句子末尾引用上下文。请按照引用编号[citation:X]的格式在答案中对应部分引用上下文。如果一句话源自多个上下文，请列出所有相关的引用编号，例如[citation:3][citation:5]。

在回答时，请注意以下几点：
- 今天是{cur_date}。
- 必须从多个不同的新闻源或网页中提取信息，不要仅仅依赖单一来源。
- 新闻类内容要注意信息的时效性，优先使用最新的信息源。
- 对于每个重要论点，至少要引用2-3个不同来源的内容以确保信息的可靠性。
- 对于时效性内容，要明确标注信息的发布时间。
- 信息的分类整理要条理清晰，使用小标题或者要点的形式组织内容。
- 如果不同来源的信息有冲突，需要指出这些差异并说明可能的原因。
- 在合适的时候，可以添加"延伸阅读"部分，提供更多相关资源的链接。
- 除非用户要求，否则你回答的语言需要和用户提问的语言保持一致。

# 用户消息为：
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