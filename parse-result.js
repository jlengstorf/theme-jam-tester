require('dotenv').config();

const axios = require('axios');
const xml2js = require('xml2js');
const base = require('airtable').base('appiLjgqHaXNtHx0x');

const parser = new xml2js.Parser();

base('themes')
  .select({
    maxRecords: 100,
    view: 'Submissions',
    filterByFormula:
      "AND(NOT({Webpagetest Result} = 'https://example.com/ERROR'), {GZIP Score} = '')"
  })
  .eachPage(
    (records, _fetchNextPage) => {
      records.forEach(record => {
        const testId = record.fields['Webpagetest Result'].replace(
          /^.*result\/(.+?)\//,
          '$1'
        );

        axios
          .get(`https://www.webpagetest.org/xmlResult/${testId}/`, {
            params: {
              r: record.id
            },
            responseType: 'document'
          })
          .then(response => {
            parser.parseString(response.data, (err, result) => {
              if (err) {
                console.error(err);
                return;
              }

              const testData = result.response.data[0].median[0].firstView[0];

              const scores = {
                gzip: testData.score_gzip[0],
                compress: testData.score_compress[0],
                keepAlive: testData['score_keep-alive'][0],
                cache: testData.score_cache[0],
                cdn: testData.score_cdn[0],
                lighthouseBestPractices: testData['lighthouse.BestPractices']
                  ? testData['lighthouse.BestPractices'][0]
                  : 0,
                lighthousePerformance: testData['lighthouse.Performance']
                  ? testData['lighthouse.Performance'][0]
                  : 0,
                lighthouseAccessibility: testData['lighthouse.Accessibility']
                  ? testData['lighthouse.Accessibility'][0]
                  : 0,
                lighthouseSEO: testData['lighthouse.SEO']
                  ? testData['lighthouse.SEO'][0]
                  : 0
              };

              base('themes').update(
                record.id,
                {
                  'Keep Alive Score': +scores.keepAlive,
                  'GZIP Score': +scores.gzip,
                  'Compress Images Score': +scores.compress,
                  'Caching Score': +scores.cache,
                  'CDN Score': +scores.cdn,
                  'Lighthouse Perf': +scores.lighthousePerformance,
                  'Lighthouse Best Practices': +scores.lighthouseBestPractices,
                  'Lighthouse SEO': +scores.lighthouseSEO,
                  'Lighthouse Accessibility': +scores.lighthouseAccessibility
                },
                (err, record) => {
                  if (err) {
                    console.error(err);
                    return;
                  }

                  console.log(`Updated ${record.fields.Name}`);
                }
              );
            });
          });
      });
    },
    err => {
      if (err) {
        console.error(err);
      }
    }
  );
