/**
 * ClubSheIs — Google Apps Script Web App
 *
 * Creates formatted Google Docs from your Client Flow app.
 *
 * SETUP: See README or deploy instructions in the Client Flow repo.
 *
 * IMPORTANT: After updating this script, you must:
 * 1. Click Deploy → Manage deployments
 * 2. Click the pencil icon on your deployment
 * 3. Set Version to "New version"
 * 4. Click Deploy
 */

function doPost(e) {
  try {
    // Handle both form submissions and JSON API calls
    var data;
    var isForm = false;

    if (e.parameter && e.parameter.title) {
      // Form submission — data is in e.parameter
      data = {
        title: e.parameter.title || 'Untitled Document',
        content: e.parameter.content || '',
        folderId: e.parameter.folderId || ''
      };
      isForm = true;
    } else {
      // JSON API call
      data = JSON.parse(e.postData.contents);
    }

    var title = data.title || 'Untitled Document';
    var content = data.content || '';
    var folderId = data.folderId || '';

    // Create the Google Doc
    var doc = DocumentApp.create(title);
    var body = doc.getBody();

    // Clear default empty paragraph
    body.clear();

    // Parse markdown-style content into formatted Google Doc
    var lines = content.split('\n');
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];

      if (line.match(/^## SECTION \d|^## PART \d|^## /)) {
        var heading = line.replace(/^#+\s*/, '');
        var para = body.appendParagraph(heading);
        para.setHeading(DocumentApp.ParagraphHeading.HEADING2);
        para.setBold(true);
        para.setForegroundColor('#1a1a1a');
      } else if (line.match(/^#### /)) {
        var heading = line.replace(/^#+\s*/, '');
        var para = body.appendParagraph(heading);
        para.setHeading(DocumentApp.ParagraphHeading.HEADING4);
        para.setBold(true);
      } else if (line.match(/^### /)) {
        var heading = line.replace(/^#+\s*/, '');
        var para = body.appendParagraph(heading);
        para.setHeading(DocumentApp.ParagraphHeading.HEADING3);
        para.setBold(true);
      } else if (line.match(/^---+$/)) {
        var para = body.appendParagraph('');
        para.appendHorizontalRule();
      } else if (line.match(/^GAP:/) || line.match(/^- GAP:/)) {
        var para = body.appendParagraph(line);
        para.setBackgroundColor('#FEF9C3');
        para.setForegroundColor('#92400E');
        para.setBold(true);
      } else if (line.match(/\[ASSUMPTION:/)) {
        var para = body.appendParagraph(line);
        para.setBackgroundColor('#FEF9C3');
        para.setForegroundColor('#92400E');
      } else if (line.match(/^- \*\*/)) {
        var para = body.appendListItem(line.replace(/^- /, ''));
        var text = para.editAsText();
        var fullText = text.getText();
        var boldMatch = fullText.match(/\*\*(.+?)\*\*/);
        if (boldMatch) {
          var start = fullText.indexOf('**');
          var cleaned = fullText.replace(/\*\*/g, '');
          text.setText(cleaned);
          text.setBold(start, start + boldMatch[1].length - 1, true);
        }
      } else if (line.match(/^- /)) {
        var para = body.appendListItem(line.replace(/^- /, ''));
      } else if (line.match(/^\d+\. /)) {
        var para = body.appendListItem(line.replace(/^\d+\.\s*/, ''));
        para.setGlyphType(DocumentApp.GlyphType.NUMBER);
      } else if (line.trim() === '') {
        body.appendParagraph('');
      } else {
        var para = body.appendParagraph(line);
        var text = para.editAsText();
        var fullText = text.getText();
        while (fullText.indexOf('**') !== -1) {
          var start = fullText.indexOf('**');
          var end = fullText.indexOf('**', start + 2);
          if (end === -1) break;
          var boldText = fullText.substring(start + 2, end);
          fullText = fullText.substring(0, start) + boldText + fullText.substring(end + 2);
          text.setText(fullText);
          text.setBold(start, start + boldText.length - 1, true);
        }
      }
    }

    // Move to folder if specified
    if (folderId) {
      try {
        var folder = DriveApp.getFolderById(folderId);
        var file = DriveApp.getFileById(doc.getId());
        folder.addFile(file);
        DriveApp.getRootFolder().removeFile(file);
      } catch (e) {
        // Folder not found — doc stays in root
      }
    }

    doc.saveAndClose();

    var docUrl = doc.getUrl();

    if (isForm) {
      // Form submission — return HTML that redirects to the doc
      return HtmlService.createHtmlOutput(
        '<html><head><script>window.location.href="' + docUrl + '";</script></head>' +
        '<body><p>Document created! Redirecting... <a href="' + docUrl + '">Click here</a> if not redirected.</p></body></html>'
      );
    } else {
      // JSON API call — return JSON
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        docId: doc.getId(),
        docUrl: docUrl,
        title: title
      })).setMimeType(ContentService.MimeType.JSON);
    }

  } catch (err) {
    if (typeof isForm !== 'undefined' && isForm) {
      return HtmlService.createHtmlOutput(
        '<html><body><p>Error: ' + err.toString() + '</p></body></html>'
      );
    }
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    service: 'ClubSheIs Doc Creator'
  })).setMimeType(ContentService.MimeType.JSON);
}
