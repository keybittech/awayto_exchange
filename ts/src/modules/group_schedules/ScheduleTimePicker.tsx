import React, { useContext, useMemo } from 'react';
import { Duration, DurationUnitType } from 'dayjs/plugin/duration';

import TextField from '@mui/material/TextField';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';

import { useTimeName, dayjs, getRelativeDuration, TimeUnit } from 'awayto/hooks';

import GroupScheduleContext from './GroupScheduleContext';
import GroupScheduleSelectionContext from './GroupScheduleSelectionContext';

export function ScheduleTimePicker(): React.JSX.Element {

  const { selectGroupSchedule: { item: groupSchedule } } = useContext(GroupScheduleContext) as GroupScheduleContextType;

  const {
    selectedDate,
    selectedTime,
    setSelectedTime,
    dateSlots,
    firstAvailable,
    bracketSlotDateDayDiff
  } = useContext(GroupScheduleSelectionContext) as GroupScheduleSelectionContextType;

  const { bracketTimeUnitId, slotTimeUnitId, slotDuration } = groupSchedule.schedule || {};
  const bracketTimeUnitName = useTimeName(bracketTimeUnitId);
  const slotTimeUnitName = useTimeName(slotTimeUnitId);

  const slotFactors = useMemo(() => {
    if (!slotDuration) return [];

    const sf = [] as number[];

    const sessionDuration = Math.round(getRelativeDuration(1, bracketTimeUnitName, slotTimeUnitName));

    for (let factor = 1; factor < sessionDuration; factor++) {
      const modRes = sessionDuration % factor;
      if (modRes === 0 || modRes === slotDuration) {
        sf.push(factor);
      }
    }

    return sf;
  }, [bracketTimeUnitName, slotTimeUnitName, slotDuration]);

  return <TimePicker
    label="Time"
    value={selectedTime}
    onChange={time => setSelectedTime(time)}
    ampmInClock={true}
    ignoreInvalidInputs={true}
    onAccept={time => setSelectedTime(time)}
    shouldDisableTime={(time, clockType) => {
      if (dateSlots?.length) {
        const currentSlotTime = selectedTime;
        const currentSlotDate = selectedDate || firstAvailable.time;
        // Ignore seconds check because final time doesn't need seconds, so this will cause invalidity
        if ('seconds' === clockType) return false;

        // Create a duration based on the current clock validation check and the days from start of current week
        let duration = dayjs.duration(time, clockType).add(bracketSlotDateDayDiff, TimeUnit.DAY);

        // Submitting a new time a two step process, an hour is selected, and then a minute. Upon hour selection, selectedTime is first set, and then when the user selects a minute, that will cause this block to run, so we should add the existing hour from selectedTime such that "hour + minute" will give us the total duration, i.e. 4:30 AM = PT4H30M
        if ('minutes' === clockType && currentSlotTime) {
          duration = duration.add(currentSlotTime.hour(), TimeUnit.HOUR);
        }

        // When checking hours, we need to also check the hour + next session time, because shouldDisableTime checks atomic parts of the clock, either hour or minute, but no both. So instead of keeping track of some ongoing clock, we can just check both durations here
        const checkDurations: Duration[] = [duration];
        if ('hours' === clockType) {
          for (const factor of slotFactors) {
            checkDurations.push(duration.add(factor, slotTimeUnitName as DurationUnitType));
          }
        }

        // Check if any matching slot is available
        const hasMatchingSlot = dateSlots.some(s => {

          return s.startDate === currentSlotDate.format("YYYY-MM-DD") && checkDurations.some(d => {
            // Convert startTime to milliseconds before making the comparison

            const startTimeDuration = dayjs.duration(s.startTime);
            return d.hours() === startTimeDuration.hours() && d.minutes() === startTimeDuration.minutes();
          });
        });

        // Disable the time if there's no matching slot
        return !hasMatchingSlot;
      }
      return true;
    }}
    renderInput={params => <TextField fullWidth {...params} />}
  />
}

export default ScheduleTimePicker;
