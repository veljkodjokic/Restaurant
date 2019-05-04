@auth()
    @if(\Auth::user()->isAdmin())
        @include('layouts.navbars.sides.auth')
    @else
        @include('layouts.navbars.sides.auth')
    @endif
@endauth