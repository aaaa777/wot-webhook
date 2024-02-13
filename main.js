var DEBUG_MODE = false;

/**
 * フィード定義を取得
 */
function getFeeds() {
  // feedsシートのA1:B最終行を取得する
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('feeds');
  const lastRow = sheet.getDataRange().getLastRow();
  const values = sheet.getRange(1,1,lastRow,2).getValues();

  const feeds = [];
  values.forEach((value) => {
    const feed = {};
    feed["name"] = value[0];
    feed["link"] = value[1];

    feeds.push(feed);
  });

  return feeds
}

function getWebhookUrl() {
  return PropertiesService.getScriptProperties().getProperty("WEBHOOK_URL");
}

/**
 * RSSフィードから記事を取得する
 */
function getArticles() {
  // フィード定義を取得
  const feeds = getFeeds();

  for (const feed of feeds) {
    // RSSの読み込み
    let xml = UrlFetchApp.fetch(feed.link).getContentText();
    let document = XmlService.parse(xml);
    let items = document.getRootElement().getChild('channel').getChildren('item');

    // スプレッドシートからデータを取得
    let articlesSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('articles');
    let lastRow = articlesSheet.getDataRange().getLastRow();
    let urls = articlesSheet.getRange(1, 3, lastRow).getValues();

    // 新しい記事かどうかを古いアイテム(記事)から比較するため
    items.reverse();

    // RSSから取得したデータと比較と保存
    for (var item of items) {
      let title = item.getChild('title').getText();
      let link = item.getChild('link').getValue();
      let pubDate = Utilities.formatDate(new Date(item.getChild('pubDate').getValue()), "JST", "yyyy-MM-dd'T'HH:mm:ssXXX");

      // URLが一致しないときは新しいデータ
      if (urls.some(url => url[0] === link)) {
        continue;
      }

      // スプレッドシートへの保存
      articlesSheet.appendRow([feed.name, title, link, pubDate]);

      // チャンネルに投稿
      if (!DEBUG_MODE) {
        postToChannel(feed.name, title, link);
      }

      console.log(feed.name + ': ' + title);
    }
  }
}

/**
 * チャンネルに通知を投稿する
 * @param {string} name フィード名
 * @param {string} title 記事タイトル
 * @param {string} link 記事リンク
 */
function postToChannel(name, title, link) {
  const webhookURL = getWebhookUrl();

  const message = {
    "content": '**' + title + '**\n' + link,
  }

  const param = {
    "method": "POST",
    "headers": { 'Content-type': "application/json" },
    "payload": JSON.stringify(message)
  }

  UrlFetchApp.fetch(webhookURL, param);
}

function testPostToChannel() {
  DEBUG_MODE = true;
  postToChannel('test', 'test', 'https://example.com');
}

function testGetArticles() {
  DEBUG_MODE = true;
  getArticles();
}