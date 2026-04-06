/**
 * ClubSheIs — Google Apps Script Web App
 *
 * This script creates Google Docs from your Client Flow app.
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://script.google.com
 * 2. Click "New project"
 * 3. Delete the default code and paste this entire file
 * 4. Name the project "ClubSheIs Doc Creator"
 * 5. Click "Deploy" → "New deployment"
 * 6. Click the gear icon → select "Web app"
 * 7. Set "Execute as" → "Me"
 * 8. Set "Who has access" → "Anyone"
 * 9. Click "Deploy"
 * 10. Copy the Web App URL
 * 11. Add it to your .env.local: GOOGLE_APPS_SCRIPT_URL=<paste URL here>
 * 12. Also add it in Vercel → Settings → Environment Variables
 * 13. Redeploy
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
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
        // Main section heading
        var heading = line.replace(/^#+\s*/, '');
        var para = body.appendParagraph(heading);
        para.setHeading(DocumentApp.ParagraphHeading.HEADING2);
        para.setBold(true);
        para.setForegroundColor('#1a1a1a');
      } else if (line.match(/^#### /)) {
        // Sub-sub heading
        var heading = line.replace(/^#+\s*/, '');
        var para = body.appendParagraph(heading);
        para.setHeading(DocumentApp.ParagraphHeading.HEADING4);
        para.setBold(true);
      } else if (line.match(/^### /)) {
        // Sub heading
        var heading = line.replace(/^#+\s*/, '');
        var para = body.appendParagraph(heading);
        para.setHeading(DocumentApp.ParagraphHeading.HEADING3);
        para.setBold(true);
      } else if (line.match(/^---+$/)) {
        // Horizontal rule — add a thin line
        var para = body.appendParagraph('');
        para.appendHorizontalRule();
      } else if (line.match(/^GAP:/)) {
        // GAP items — highlight yellow
        var para = body.appendParagraph(line);
        para.setBackgroundColor('#FEF9C3');
        para.setForegroundColor('#92400E');
        para.setBold(true);
      } else if (line.match(/\[ASSUMPTION:/)) {
        // Assumption items — highlight yellow
        var para = body.appendParagraph(line);
        para.setBackgroundColor('#FEF9C3');
        para.setForegroundColor('#92400E');
      } else if (line.match(/^- \*\*/)) {
        // Bold list item like "- **Key:** value"
        var para = body.appendListItem(line.replace(/^- /, ''));
        // Bold the part between ** **
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
        // Regular list item
        var para = body.appendListItem(line.replace(/^- /, ''));
      } else if (line.match(/^\d+\. /)) {
        // Numbered list
        var para = body.appendListItem(line.replace(/^\d+\.\s*/, ''));
        para.setGlyphType(DocumentApp.GlyphType.NUMBER);
      } else if (line.trim() === '') {
        // Empty line
        body.appendParagraph('');
      } else {
        // Regular paragraph — handle inline bold **text**
        var para = body.appendParagraph(line);
        var text = para.editAsText();
        var fullText = text.getText();
        // Handle bold markers
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

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      docId: doc.getId(),
      docUrl: doc.getUrl(),
      title: title
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
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
