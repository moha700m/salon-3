import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanBusinessDisplayName } from '@/lib/business-name';

test('removes Arabic rating suffixes from the display name only', () => {
  const original = 'صالون أراكم للحلاقة الرجالية 5 نجوم';
  assert.equal(cleanBusinessDisplayName(original), 'صالون أراكم للحلاقة الرجالية');
  assert.equal(original, 'صالون أراكم للحلاقة الرجالية 5 نجوم');
  assert.equal(cleanBusinessDisplayName('حلاق الراقي تقييم 4.7'), 'حلاق الراقي');
  assert.equal(cleanBusinessDisplayName('صالون المثال خمس نجوم ---'), 'صالون المثال');
  assert.equal(cleanBusinessDisplayName('صالون النجمة ⭐⭐⭐⭐⭐'), 'صالون النجمة');
});

test('removes English rating suffixes and can preserve a confirmed brand suffix', () => {
  assert.equal(cleanBusinessDisplayName('Arakem Barber 4.8 stars'), 'Arakem Barber');
  assert.equal(cleanBusinessDisplayName('Arakem Barber - Rating 4.7'), 'Arakem Barber');
  assert.equal(
    cleanBusinessDisplayName('Five Stars Barber 5 stars', { preserveRatingSuffix: true }),
    'Five Stars Barber 5 stars',
  );
});
