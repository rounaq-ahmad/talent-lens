import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TheoreticalQuestion } from '../../../../core/models/question.model';

@Component({
  selector: 'app-theoretical-question',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './theoretical-question.component.html',
  styleUrl: './theoretical-question.component.scss',
})
export class TheoreticalQuestionComponent {
  question = input.required<TheoreticalQuestion>();
  answer = input<string | number | null>(null);

  answerChange = output<string | number | null>();

  selectOption(index: number): void {
    this.answerChange.emit(index);
  }

  onTextChange(value: string): void {
    this.answerChange.emit(value);
  }
}
