import type { Source } from "../types/research";

const clean = (v?: string) => (v ?? "").trim();

function authorYear(source: Source): string {
  const author = clean(source.author) || "作成者未確認";
  const year = clean(source.year) || clean(source.date) || "n.d.";
  return `${author} (${year})`;
}

export function buildApaLikeCitation(source: Source): string {
  const ay = authorYear(source);
  const title = clean(source.title) || "Untitled";
  const publisher = clean(source.publisher);
  const container = clean(source.containerTitle);
  const volume = clean(source.volume);
  const issue = clean(source.issue);
  const pages = clean(source.pages);
  const doi = clean(source.doi);
  const url = clean(source.url);

  switch (source.citationKind) {
    case "journal": {
      const volIssue = [volume, issue ? `(${issue})` : ""].join("").trim();
      return [
        `${ay}. ${title}.`,
        container,
        volIssue,
        pages,
        doi ? `https://doi.org/${doi.replace(/^https?:\/\/doi.org\//, "")}` : url,
      ]
        .filter(Boolean)
        .join(", ");
    }
    case "book":
      return [`${ay}. ${title}.`, publisher, doi || url].filter(Boolean).join(" ");
    case "archival": {
      const archiveLine = [source.archiveName, source.collectionName, source.box, source.folder]
        .filter(Boolean)
        .join(" / ");
      return [`${ay}. ${title}.`, archiveLine, source.mediumDescription, url].filter(Boolean).join(" ");
    }
    default:
      return [`${ay}. ${title}.`, container || publisher, doi || url].filter(Boolean).join(" ");
  }
}
