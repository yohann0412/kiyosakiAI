/** Run the retention sweep by hand: `npm run purge`. Production runs it hourly via Vercel Cron. */
import { purge } from "@/lib/purge";

purge()
  .then((removed) => console.log("swept", removed))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
