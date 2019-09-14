import moment from 'moment';
import knex from 'knexClient';

export default async function getAvailabilities(date, numberOfDays = 7) {

  let result = [];
  let weeks = Math.ceil(numberOfDays / 7);

  for (let j = 0; j < weeks; j++) {

    let dayCount = 7;
    if (j + 1 === weeks) dayCount = numberOfDays % 7; 
    if (numberOfDays % 7 === 0) dayCount = 7;
    const availabilities = new Map();

    for (let i = 0; i < dayCount; ++i) {
      const tmpDate = moment(date).add(i, 'days', j, 'weeks');
      availabilities.set(tmpDate.format('d'), {
        date: tmpDate.toDate(),
        slots: []
      });
    }

    const events = await knex
      .select('kind', 'starts_at', 'ends_at', 'weekly_recurring')
      .from('events')
      .where(function() {
        this.where('weekly_recurring', true).orWhere('ends_at', '>', +date);
      });

    const openings = events.filter(el => {
      return el.kind === 'opening';
    });

    const nonOpenings = events.filter(el => {
      return el.kind !== 'opening';
    });

    for (const opening of openings) {
      for (
        let date = moment(opening.starts_at);
        date.isBefore(opening.ends_at);
        date.add(30, 'minutes')
      ) {
        const day = availabilities.get(date.format('d'));

        if (opening.starts_at - day.date.getTime() < 86400000)
          day.slots.push(date.format('H:mm'));
      }
    }

    for (const nonOpening of nonOpenings) {
      for (
        let date = moment(nonOpening.starts_at);
        date.isBefore(nonOpening.ends_at);
        date.add(30, 'minutes')
      ) {
        const day = availabilities.get(date.format('d'));
        day.slots = day.slots.filter(
          slot => slot.indexOf(date.format('H:mm')) === -1
        );
      }
    }
    result = result.concat(Array.from(availabilities.values()));
  }
  return result;
}