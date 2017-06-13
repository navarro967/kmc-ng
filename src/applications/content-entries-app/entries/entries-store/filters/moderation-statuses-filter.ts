import * as R from 'ramda';

import { EntriesStore } from "../entries-store.service";
import { ValueFilter } from '../value-filter';

export class ModerationStatusesFilter  extends ValueFilter<string>{

    constructor( value : string, label)
    {
        super(label, value,{token: 'applications.content.filters.moderation', args: {'0': label}});
    }
}

EntriesStore.registerFilterType(ModerationStatusesFilter, (items, request) =>
{
    request.filter.moderationStatusIn = R.reduce((acc : string, item : ValueFilter<string>) =>
    {
        return `${acc}${acc ? ',' : ''}${item.value}`;
    },'',items);
});
