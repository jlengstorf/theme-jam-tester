require('dotenv').config();

const axios = require('axios');
const base = require('airtable').base('appiLjgqHaXNtHx0x');

base('themes')
  .select({
    maxRecords: 20,
    view: 'Submissions',
    filterByFormula: "{Webpagetest Result} = ''"
  })
  .eachPage(
    (records, fetchNextPage) => {
      records.forEach(record => {
        if (!!record.fields['Webpagetest Result']) {
          console.log(`Report already exists for ${record.fields.Name}`);
          return;
        }

        axios
          .get(
            `https://www.webpagetest.org/runtest.php?url=${
              record.fields.Demo
            }&k=${
              process.env.WPT_API_KEY
            }&lighthouse=1&f=json&profile=Mobile&rv=1`
          )
          .then(response => {
            let reportUrl;
            if (response.data.statusText !== 'Ok') {
              reportUrl = 'https://example.com/ERROR';
            } else {
              reportUrl = response.data.data.userUrl;
            }

            base('themes').update(
              record.id,
              {
                'Webpagetest Result': reportUrl
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
      fetchNextPage();
    },
    err => {
      if (err) {
        console.error(err);
      }
    }
  );
