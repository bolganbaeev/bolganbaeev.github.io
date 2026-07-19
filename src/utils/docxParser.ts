import JSZip from 'jszip';

export async function parseDocxToParagraphs(fileUrl: string): Promise<string[]> {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch docx file: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    
    const zip = await JSZip.loadAsync(arrayBuffer);
    const docXmlFile = zip.file('word/document.xml');
    if (!docXmlFile) {
      throw new Error('Invalid docx: word/document.xml not found');
    }
    
    const xmlText = await docXmlFile.async('text');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    const paragraphs = xmlDoc.getElementsByTagName('w:p');
    const result: string[] = [];
    
    for (let i = 0; i < paragraphs.length; i++) {
      const pNode = paragraphs[i];
      const textNodes = pNode.getElementsByTagName('w:t');
      let pText = '';
      
      for (let j = 0; j < textNodes.length; j++) {
        pText += textNodes[j].textContent || '';
      }
      
      const trimmed = pText.trim();
      if (trimmed) {
        result.push(trimmed);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error parsing docx:', error);
    throw error;
  }
}
