import { CanDeactivateFn } from '@angular/router';
import { TestComponent } from '../../features/test/test.component';

export const canDeactivateTest: CanDeactivateFn<TestComponent> = (component) => {
  if (!component.testService.isActive()) return true;
  return confirm(
    'Your answers are saved and will be restored if you return.\n\nAre you sure you want to leave the test?',
  );
};
