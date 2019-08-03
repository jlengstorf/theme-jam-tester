require('dotenv').config();

const axios = require('axios');
const base = require('airtable').base('appiLjgqHaXNtHx0x');

const REQUIRED_KEYWORDS = ['gatsby', 'gatsby-plugin', 'gatsby-theme'];

base('themes')
  .select({
    maxRecords: 100,
    view: 'Submissions To Review',
    filterByFormula:
      'OR({Has Required Keywords} = BLANK(), {Has Repository} = BLANK(), {Has Author} = BLANK())'
  })
  .eachPage(
    (records, fetchNextPage) => {
      records.forEach(async record => {
        const name = record.fields.Package.replace(/^.*package\/(.+)$/, '$1');
        const { data: pkg } = await axios(
          `https://unpkg.com/${name}/package.json`
        ).catch(error => {
          console.error(error);
        });

        const hasKeywords =
          pkg.keywords &&
          REQUIRED_KEYWORDS.every(keyword => pkg.keywords.includes(keyword));

        const hasRepo = pkg.repository && !!pkg.repository.url;
        const hasAuthor = !!pkg.author;

        base('themes').update(
          record.id,
          {
            'Has Required Keywords': hasKeywords ? 'Yes' : 'No',
            'Has Repository': hasRepo ? 'Yes' : 'No',
            'Has Author': hasAuthor ? 'Yes' : 'No'
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
      fetchNextPage();
    },
    err => {
      if (err) {
        console.error(err);
      }
    }
  );
